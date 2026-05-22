import { useRef, useEffect, useCallback } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import { heroNodes, heroEdges, clusterColors, clusterCenters } from '../../data/heroGraphData';

const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
const MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;
const PROXIMITY_RADIUS = 150;

export default function HeroGraph({ scrollProgress = 0 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rotationRef = useRef(0);

  // Initialize simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    sizeRef.current = { w, h };

    // Use fewer nodes on mobile
    const sourceNodes = MOBILE ? heroNodes.slice(0, 22) : heroNodes;
    const nodeIds = new Set(sourceNodes.map(n => n.id));
    const sourceEdges = heroEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    const nodes = sourceNodes.map(n => {
      const center = clusterCenters[n.group];
      return {
        ...n,
        x: center.x * w + (Math.random() - 0.5) * 120,
        y: center.y * h + (Math.random() - 0.5) * 120,
        radius: n.size,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 3 + Math.random() * 2,
      };
    });

    const links = sourceEdges.map(e => ({ source: e.source, target: e.target }));

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id).distance(80).strength(0.2))
      .force('charge', forceManyBody().strength(-200))
      .force('collide', forceCollide().radius(d => d.radius + 12).strength(0.6))
      .force('x', forceX(d => clusterCenters[d.group].x * w).strength(0.12))
      .force('y', forceY(d => clusterCenters[d.group].y * h).strength(0.12))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    nodesRef.current = nodes;
    linksRef.current = links;

    // Initialize particles on edges
    particlesRef.current = links.map(() => ({
      t: Math.random(),
      speed: 0.001 + Math.random() * 0.002,
    }));
  }, []);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      sizeRef.current = { w, h };
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Bezier midpoint for curved edges
  const getEdgeControl = useCallback((sx, sy, tx, ty) => {
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const dx = tx - sx;
    const dy = ty - sy;
    return { x: mx - dy * 0.12, y: my + dx * 0.12 };
  }, []);

  const bezierPoint = useCallback((sx, sy, cx, cy, tx, ty, t) => {
    const u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * tx,
      y: u * u * sy + 2 * u * t * cy + t * t * ty,
    };
  }, []);

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = sizeRef.current;
    const time = timeRef.current;
    const mouse = mouseRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const particles = particlesRef.current;

    ctx.clearRect(0, 0, w * DPR, h * DPR);
    ctx.save();
    ctx.scale(DPR, DPR);

    // Scroll-driven zoom
    const scrollScale = 1 + scrollProgress * 0.3;
    const cx = w / 2;
    const cy = h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scrollScale, scrollScale);
    ctx.translate(-cx, -cy);

    // Slow continuous rotation
    const reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion) {
      rotationRef.current += 0.0002;
      const rot = rotationRef.current;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);
    }

    // Draw edges
    links.forEach((link, i) => {
      const source = typeof link.source === 'object' ? link.source : nodes.find(n => n.id === link.source);
      const target = typeof link.target === 'object' ? link.target : nodes.find(n => n.id === link.target);
      if (!source || !target) return;

      const sy = source.y + (reducedMotion ? 0 : Math.sin(time / 1000 * (2 * Math.PI / source.floatSpeed) + source.floatOffset) * 3);
      const ty = target.y + (reducedMotion ? 0 : Math.sin(time / 1000 * (2 * Math.PI / target.floatSpeed) + target.floatOffset) * 3);
      const ctrl = getEdgeControl(source.x, sy, target.x, ty);

      // Edge proximity brightness
      const edgeMx = (source.x + target.x) / 2;
      const edgeMy = (sy + ty) / 2;
      const edgeDist = Math.hypot(edgeMx - mouse.x, edgeMy - mouse.y);
      const edgeProx = Math.max(0, 1 - edgeDist / (PROXIMITY_RADIUS * 1.5));
      const edgeAlpha = 0.06 + edgeProx * 0.14;

      ctx.beginPath();
      ctx.moveTo(source.x, sy);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, target.x, ty);
      ctx.strokeStyle = `rgba(255,255,255,${edgeAlpha})`;
      ctx.lineWidth = 0.8 + edgeProx * 0.6;
      ctx.stroke();

      // Particle flow along edge
      if (!MOBILE && !reducedMotion && particles[i]) {
        const p = particles[i];
        p.t += p.speed;
        if (p.t > 1) p.t -= 1;

        const pt = bezierPoint(source.x, sy, ctrl.x, ctrl.y, target.x, ty, p.t);
        const color = clusterColors[source.group] || clusterColors.auth;

        ctx.save();
        ctx.shadowBlur = 6;
        ctx.shadowColor = color.glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color.node;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.restore();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const color = clusterColors[node.group] || clusterColors.auth;
      const floatY = reducedMotion ? 0 : Math.sin(time / 1000 * (2 * Math.PI / node.floatSpeed) + node.floatOffset) * 3;
      const drawX = node.x;
      const drawY = node.y + floatY;

      // Mouse proximity effect
      const dist = Math.hypot(drawX - mouse.x, drawY - mouse.y);
      const proximityFactor = Math.max(0, 1 - dist / PROXIMITY_RADIUS);
      const displayRadius = node.radius * (1 + proximityFactor * 0.4);
      const glowIntensity = 10 + proximityFactor * 25;

      // Outer glow
      ctx.save();
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = color.glow;

      // Node fill with radial gradient
      const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, displayRadius);
      grad.addColorStop(0, color.node + 'cc');
      grad.addColorStop(0.7, color.node + '88');
      grad.addColorStop(1, color.node + '22');

      ctx.beginPath();
      ctx.arc(drawX, drawY, displayRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bright core dot
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(drawX, drawY, displayRadius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = color.node;
      ctx.globalAlpha = 0.6 + proximityFactor * 0.4;
      ctx.fill();

      // Hover ring
      if (proximityFactor > 0.3) {
        ctx.beginPath();
        ctx.arc(drawX, drawY, displayRadius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = color.node + '40';
        ctx.lineWidth = 1;
        ctx.globalAlpha = proximityFactor;
        ctx.stroke();
      }

      ctx.restore();
    });

    ctx.restore();

    timeRef.current += 16;
    animRef.current = requestAnimationFrame(draw);
  }, [scrollProgress, getEdgeControl, bezierPoint]);

  // Animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
    />
  );
}
