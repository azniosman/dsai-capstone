"use client";

/**
 * BgCanvas — full-page flow-field animation.
 *
 * Particles follow a vector field derived from fractal brownian-motion (FBM)
 * noise. A tiny per-frame alpha fill fades the trails slowly, producing the
 * long organic curves that define the aesthetic.
 *
 * Technique: Canvas 2D + value noise (no extra deps). Position: fixed at
 * z-index 0 so every page section's transparent background shows it.
 */

import { useRef, useEffect } from "react";

// ── Value noise helpers ────────────────────────────────────────────────────────
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    hash(xi, yi) * (1 - ux) * (1 - uy) +
    hash(xi + 1, yi) * ux * (1 - uy) +
    hash(xi, yi + 1) * (1 - ux) * uy +
    hash(xi + 1, yi + 1) * ux * uy
  );
}

// 3-octave FBM
function fbm(x: number, y: number): number {
  return (
    vnoise(x, y) * 0.55 +
    vnoise(x * 2.1 + 3.7, y * 2.1 + 1.5) * 0.30 +
    vnoise(x * 4.3 + 7.2, y * 4.3 + 5.1) * 0.15
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
const BG_R = 248;
const BG_G = 247;
const BG_B = 253; // ≈ oklch(0.9777 0.0041 301) — SkillBridge light bg

// ── Component ─────────────────────────────────────────────────────────────────
export default function BgCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let W = 0;
    let H = 0;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      // Solid initial fill so background matches the page colour exactly
      ctx.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`;
      ctx.fillRect(0, 0, W, H);
    };
    resize();

    const isMobile = W < 768;
    const N = isMobile ? 130 : 290;
    const SCALE = 380; // larger → smoother, more sweeping curves
    const SPEED = isMobile ? 0.45 : 0.58;
    const TAU = Math.PI * 2;

    // Flat typed arrays — faster than object arrays
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      px[i] = Math.random() * W;
      py[i] = Math.random() * H;
    }

    let raf = 0;
    let t = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.0022; // very slow time evolution → pattern shifts imperceptibly

      // ── Trail fade ──────────────────────────────────────────────────────────
      // Low alpha → long trails; high alpha → short trails.
      ctx.fillStyle = `rgba(${BG_R},${BG_G},${BG_B},0.038)`;
      ctx.fillRect(0, 0, W, H);

      // ── Particles ───────────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(142,118,200,0.20)";

      for (let i = 0; i < N; i++) {
        const nx = px[i] / SCALE + t * 0.22;
        const ny = py[i] / SCALE + t * 0.16;

        // Map FBM value (0-1) → full TAU*2.4 range for tighter curl
        const angle = fbm(nx, ny) * TAU * 2.4;

        px[i] += Math.cos(angle) * SPEED;
        py[i] += Math.sin(angle) * SPEED;

        // Wrap edges seamlessly
        if (px[i] < 0) px[i] += W;
        else if (px[i] > W) px[i] -= W;
        if (py[i] < 0) py[i] += H;
        else if (py[i] > H) py[i] -= H;

        ctx.beginPath();
        ctx.arc(px[i], py[i], 0.95, 0, TAU);
        ctx.fill();
      }
    };

    animate();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
