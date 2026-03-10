"use client";

/**
 * @file TacticalMapCanvas.tsx
 * @description A cinematic, GPU-friendly canvas animation that renders a spy/mission-control
 * map screen effect. Features animated nodes, connecting lines, particle trails, glitch bursts,
 * and ping rings — all composited on a single <canvas> element for maximum performance.
 *
 * ## Customization
 * All animation parameters are exposed via {@link TacticalMapConfig}. Override defaults by
 * passing a `config` prop.
 *
 * ## Performance notes
 * - Single canvas, single RAF loop — no per-frame DOM mutations.
 * - All draw calls use `globalAlpha` and `shadowBlur` (GPU-accelerated in all modern browsers).
 * - ResizeObserver handles responsive resizing.
 * - Canvas is hidden behind `pointer-events: none` so UI remains fully interactive.
 */

import { useEffect, useRef, useCallback } from "react";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Customizable animation parameters. */
export interface TacticalMapConfig {
  /** Number of glowing nodes on the canvas. Default: 40 */
  readonly nodeCount: number;
  /** Max connection distance between nodes (px). Default: 200 */
  readonly connectionDistance: number;
  /** Animation speed multiplier. 1 = normal. Default: 1 */
  readonly speed: number;
  /** Primary tactical cyan colour. Default: #00f2f2 */
  readonly colorPrimary: string;
  /** Secondary blue accent colour. Default: #259df4 */
  readonly colorAccent: string;
  /** Danger/alert red colour. Default: #ff3b3b */
  readonly colorAlert: string;
  /** Overall canvas opacity (0–1). Default: 0.65 */
  readonly opacity: number;
  /** Max glow radius (shadowBlur). Default: 16 */
  readonly glowRadius: number;
  /** Min node radius (px). Default: 2 */
  readonly nodeRadiusMin: number;
  /** Max node radius (px). Default: 5 */
  readonly nodeRadiusMax: number;
  /** Number of background particles. Default: 60 */
  readonly particleCount: number;
  /** Connection line base opacity. Default: 0.25 */
  readonly lineOpacity: number;
  /** Glitch trigger interval (ms). Default: 4000 */
  readonly glitchIntervalMs: number;
}

const DEFAULT_CONFIG: TacticalMapConfig = {
  nodeCount: 40,
  connectionDistance: 200,
  speed: 1,
  colorPrimary: "#00f2f2",
  colorAccent: "#259df4",
  colorAlert: "#ff3b3b",
  opacity: 0.65,
  glowRadius: 16,
  nodeRadiusMin: 2,
  nodeRadiusMax: 5,
  particleCount: 60,
  lineOpacity: 0.25,
  glitchIntervalMs: 4000,
};

// ─── Internal types ───────────────────────────────────────────────────────────

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** 0 = cyan primary, 1 = blue accent, 2 = red alert */
  colorIndex: number;
  /** Ping ring state */
  pingPhase: number;
  pingActive: boolean;
  pingTimer: number;
  /** "Data intensity" — controls glow brightness */
  intensity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TacticalMapCanvasProps {
  /** Optional config overrides. Merged with {@link DEFAULT_CONFIG}. */
  readonly config?: Partial<TacticalMapConfig>;
  /** React className forwarded to the wrapper <div>. */
  readonly className?: string;
}

/**
 * Renders a fullscreen canvas-based tactical map animation behind dashboard content.
 * Completely pointer-events-free and z-index aware.
 */
const TacticalMapCanvas = ({
  config: configOverride,
  className = "",
}: TacticalMapCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Cancel token for the RAF loop. */
  const rafRef = useRef<number>(0);
  /** Merged config stored in a ref to avoid stale closure in the RAF loop. */
  const cfgRef = useRef<TacticalMapConfig>({
    ...DEFAULT_CONFIG,
    ...configOverride,
  });

  // Update cfgRef when prop changes without restarting the loop.
  useEffect(() => {
    cfgRef.current = { ...DEFAULT_CONFIG, ...configOverride };
  }, [configOverride]);

  /** Mouse position — updated on mousemove, used to repel nearby nodes. */
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  /** Glitch state. */
  const glitchRef = useRef<{ active: boolean; ttl: number }>({
    active: false,
    ttl: 0,
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = null;
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Trigger a ping on the nearest node to the click point.
    const nodes = nodesRef.current;
    let closest: Node | null = null;
    let closestDist = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x - mx, n.y - my);
      if (d < closestDist) {
        closestDist = d;
        closest = n;
      }
    }
    if (closest && closestDist < 80) {
      closest.pingActive = true;
      closest.pingPhase = 0;
    }
    // Also trigger a glitch flash on click.
    glitchRef.current = { active: true, ttl: 6 };
  }, []);

  /** Node array stored in a ref for stable access inside RAF loop. */
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  /** Initialise nodes and particles for the given canvas dimensions. */
  const initScene = useCallback(
    (width: number, height: number, cfg: TacticalMapConfig) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      nodesRef.current = Array.from({ length: cfg.nodeCount }, () => {
        const colorRoll = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4 * cfg.speed,
          vy: (Math.random() - 0.5) * 0.4 * cfg.speed,
          radius:
            cfg.nodeRadiusMin +
            Math.random() * (cfg.nodeRadiusMax - cfg.nodeRadiusMin),
          colorIndex: colorRoll < 0.6 ? 0 : colorRoll < 0.9 ? 1 : 2,
          pingPhase: 0,
          pingActive: Math.random() < 0.15,
          pingTimer: Math.random() * 200,
          intensity: 0.4 + Math.random() * 0.6,
        };
      });

      // eslint-disable-next-line react-hooks/exhaustive-deps
      particlesRef.current = Array.from({ length: cfg.particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 0.5,
        radius: 0.5 + Math.random() * 1,
      }));
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = cfgRef.current;

    /** Resize canvas to match its CSS-rendered size (handles DPR). */
    const resize = () => {
      const dpr = window.devicePixelRatio ?? 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      initScene(w, h, cfgRef.current);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Attach interaction listeners to the parent window (canvas is pointer-events-none).
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    // Attach click to the canvas's parent so foreground buttons still receive clicks first.
    const parent = canvas.parentElement;
    parent?.addEventListener("click", handleClick, { passive: true });

    // Glitch scheduler.
    const scheduleGlitch = () => {
      const delay =
        cfgRef.current.glitchIntervalMs * (0.8 + Math.random() * 0.4);
      return setTimeout(() => {
        glitchRef.current = { active: true, ttl: 8 };
        glitchTimerRef.current = scheduleGlitch();
      }, delay);
    };
    const glitchTimerRef = { current: scheduleGlitch() };

    // ── Colour helpers ──────────────────────────────────────────────────────
    const getNodeColor = (n: Node): string => {
      const c = cfgRef.current;
      return [c.colorPrimary, c.colorAccent, c.colorAlert][n.colorIndex];
    };

    // ── RAF draw loop ───────────────────────────────────────────────────────
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const c = cfgRef.current;
      const nodes = nodesRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const glitch = glitchRef.current;

      // Clear canvas fully so the static map underneath shows through.
      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = c.opacity;

      // ── Draw grid overlay (subtle hex-like tactical grid lines) ──────────
      ctx.strokeStyle = `rgba(0,242,242,0.03)`;
      ctx.lineWidth = 0.5;
      const gridStep = 80;
      for (let gx = 0; gx < w; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // ── Particles ─────────────────────────────────────────────────────────
      for (const p of particles) {
        p.life -= 0.003 * c.speed;
        if (p.life <= 0) {
          p.life = p.maxLife;
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        p.x += p.vx * c.speed;
        p.y += p.vy * c.speed;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(37,157,244,${alpha})`;
        ctx.fill();
      }

      // ── Connection lines ──────────────────────────────────────────────────
      const distSq = c.connectionDistance * c.connectionDistance;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > distSq) continue;

          const proximity = 1 - Math.sqrt(d2) / c.connectionDistance;
          const alpha = proximity * c.lineOpacity;

          // Determine line colour from primary node.
          const baseColor =
            a.colorIndex === 2 || b.colorIndex === 2
              ? c.colorAlert
              : a.colorIndex === 1 || b.colorIndex === 1
                ? c.colorAccent
                : c.colorPrimary;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = baseColor;
          ctx.globalAlpha = alpha * c.opacity;
          ctx.lineWidth = proximity * 1.5;
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = proximity * 6;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      ctx.globalAlpha = c.opacity;

      // ── Nodes ─────────────────────────────────────────────────────────────
      for (const n of nodes) {
        // Mouse repulsion.
        if (mouse) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 120 && d > 0) {
            const force = (1 - d / 120) * 0.8;
            n.vx += (dx / d) * force * c.speed;
            n.vy += (dy / d) * force * c.speed;
          }
        }

        // Velocity damping.
        n.vx *= 0.98;
        n.vy *= 0.98;
        const MAX_V = 1.5 * c.speed;
        if (Math.abs(n.vx) > MAX_V) n.vx = Math.sign(n.vx) * MAX_V;
        if (Math.abs(n.vy) > MAX_V) n.vy = Math.sign(n.vy) * MAX_V;

        n.x += n.vx;
        n.y += n.vy;

        // Wrap around edges.
        if (n.x < 0) n.x = w;
        if (n.x > w) n.x = 0;
        if (n.y < 0) n.y = h;
        if (n.y > h) n.y = 0;

        const color = getNodeColor(n);
        const r = n.radius;
        const glow = n.intensity * c.glowRadius;

        // Ping ring.
        n.pingTimer -= c.speed;
        if (
          n.pingTimer <= 0 &&
          !n.pingActive &&
          Math.random() < 0.002 * c.speed
        ) {
          n.pingActive = true;
          n.pingPhase = 0;
          n.pingTimer = 100 + Math.random() * 200;
        }

        if (n.pingActive) {
          const maxR = 40;
          const pingR = n.pingPhase * maxR;
          const pingAlpha = (1 - n.pingPhase) * 0.6;
          ctx.beginPath();
          ctx.arc(n.x, n.y, pingR, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = pingAlpha * c.opacity;
          ctx.lineWidth = 1;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = c.opacity;
          n.pingPhase += 0.015 * c.speed;
          if (n.pingPhase >= 1) {
            n.pingActive = false;
            n.pingPhase = 0;
          }
        }

        // Outer glow halo.
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glow);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.12 * n.intensity * c.opacity;
        ctx.fill();

        // Core node dot.
        ctx.globalAlpha = (0.7 + 0.3 * n.intensity) * c.opacity;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Small crosshair on larger/alert nodes.
        if (r >= 3.5 || n.colorIndex === 2) {
          const armLen = r * 3;
          ctx.globalAlpha = 0.5 * c.opacity;
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(n.x - armLen, n.y);
          ctx.lineTo(n.x + armLen, n.y);
          ctx.moveTo(n.x, n.y - armLen);
          ctx.lineTo(n.x, n.y + armLen);
          ctx.stroke();
        }
      }

      // ── Glitch effect ─────────────────────────────────────────────────────
      if (glitch.active) {
        const sliceCount = 4 + Math.floor(Math.random() * 5);
        for (let s = 0; s < sliceCount; s++) {
          const sy = Math.random() * h;
          const sh = 2 + Math.random() * 12;
          const offset = (Math.random() - 0.5) * 30;
          ctx.save();
          ctx.globalAlpha = 0.08 + Math.random() * 0.08;
          const imgData = ctx.getImageData(0, sy, w, sh);
          ctx.putImageData(imgData, offset, sy);
          ctx.restore();
        }
        // Chromatic aberration flash.
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = cfgRef.current.colorPrimary;
        ctx.fillRect((Math.random() - 0.5) * 6, 0, w, h);
        ctx.globalAlpha = c.opacity;

        glitch.ttl -= 1;
        if (glitch.ttl <= 0) glitch.active = false;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      clearTimeout(glitchTimerRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      parent?.removeEventListener("click", handleClick);
    };
  }, [initScene, handleMouseMove, handleMouseLeave, handleClick]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ display: "block" }}
    />
  );
};

export default TacticalMapCanvas;
