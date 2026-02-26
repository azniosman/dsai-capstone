"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";

interface NeuronCanvasProps {
  /** "dark" — bright additive nodes on dark bg (default)
   *  "light" — solid purple nodes on light/lavender bg */
  mode?: "dark" | "light";
}

export default function NeuronCanvas({ mode = "dark" }: NeuronCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isLight = mode === "light";
    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;
    const isMobile = W < 768;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.z = 220;

    // ── Config ────────────────────────────────────────────────────────────────
    const N = isMobile ? 55 : 115;
    const CONNECT_DIST = isMobile ? 52 : 72;
    const MAX_EDGES = N * 5;
    const SPREAD = isMobile ? 180 : 290;
    const SPREAD_Y = isMobile ? 115 : 185;

    // ── Node positions & velocities ───────────────────────────────────────────
    const positions = new Float32Array(N * 3);
    const velocities: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      velocities.push({
        x: (Math.random() - 0.5) * 0.22,
        y: (Math.random() - 0.5) * 0.22,
        z: (Math.random() - 0.5) * 0.08,
      });
    }

    // ── Glow dot texture ──────────────────────────────────────────────────────
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const dctx = dotCanvas.getContext("2d")!;
    const g = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);

    if (isLight) {
      // Solid dark-purple centre — visible on light backgrounds
      g.addColorStop(0, "rgba(86, 64, 162, 1)");
      g.addColorStop(0.30, "rgba(86, 64, 162, 0.75)");
      g.addColorStop(0.65, "rgba(86, 64, 162, 0.25)");
      g.addColorStop(1, "rgba(86, 64, 162, 0)");
    } else {
      // Bright lavender — additive on dark backgrounds
      g.addColorStop(0, "rgba(195, 170, 240, 1)");
      g.addColorStop(0.25, "rgba(170, 145, 220, 0.85)");
      g.addColorStop(0.60, "rgba(130, 105, 195, 0.35)");
      g.addColorStop(1, "rgba(90, 70, 165, 0)");
    }
    dctx.fillStyle = g;
    dctx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    // ── Points (neuron nodes) ─────────────────────────────────────────────────
    const pointsGeo = new THREE.BufferGeometry();
    const posBuf = new THREE.BufferAttribute(positions.slice(), 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    pointsGeo.setAttribute("position", posBuf);

    const pointsMat = new THREE.PointsMaterial({
      map: dotTex,
      size: isLight ? (isMobile ? 7 : 9) : (isMobile ? 9 : 12),
      transparent: true,
      opacity: isLight ? 0.80 : 1.0,
      depthWrite: false,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);

    // ── Lines (synaptic edges) ────────────────────────────────────────────────
    const linePosBuf = new Float32Array(MAX_EDGES * 2 * 3);
    const lineColBuf = new Float32Array(MAX_EDGES * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    const lpAttr = new THREE.BufferAttribute(linePosBuf, 3);
    const lcAttr = new THREE.BufferAttribute(lineColBuf, 3);
    lpAttr.setUsage(THREE.DynamicDrawUsage);
    lcAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", lpAttr);
    lineGeo.setAttribute("color", lcAttr);
    lineGeo.setDrawRange(0, 0);

    // Edge base colour in linear-RGB (0-1 per channel)
    // Light mode: dark purple visible on lavender bg
    // Dark mode:  bright lavender visible on dark bg
    const EDGE_R = isLight ? 0.34 : 0.65;
    const EDGE_G = isLight ? 0.25 : 0.52;
    const EDGE_B = isLight ? 0.64 : 0.98;

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isLight ? 0.70 : 0.65,
      blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lineSegs = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineSegs);

    // ── Mouse parallax ────────────────────────────────────────────────────────
    let mx = 0;
    let my = 0;
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Animation loop ────────────────────────────────────────────────────────
    let raf = 0;
    let t = 0;
    const DIST2 = CONNECT_DIST * CONNECT_DIST;
    const xLim = SPREAD / 2;
    const yLim = SPREAD_Y / 2;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.004;

      const pos = pointsGeo.attributes.position.array as Float32Array;

      // Move nodes
      for (let i = 0; i < N; i++) {
        const k = i * 3;
        pos[k] += velocities[i].x;
        pos[k + 1] += velocities[i].y;
        pos[k + 2] += velocities[i].z;
        if (Math.abs(pos[k]) > xLim) velocities[i].x *= -1;
        if (Math.abs(pos[k + 1]) > yLim) velocities[i].y *= -1;
        if (Math.abs(pos[k + 2]) > 60) velocities[i].z *= -1;
      }
      pointsGeo.attributes.position.needsUpdate = true;

      // Pulse node size
      pointsMat.size =
        (isLight ? (isMobile ? 7 : 9) : (isMobile ? 9 : 12)) +
        Math.sin(t * 1.4) * 1.4;

      // Build edge geometry
      const lp = lineGeo.attributes.position.array as Float32Array;
      const lc = lineGeo.attributes.color.array as Float32Array;
      let edgeCount = 0;

      for (let i = 0; i < N && edgeCount < MAX_EDGES - 1; i++) {
        const ik = i * 3;
        let conns = 0;
        for (
          let j = i + 1;
          j < N && conns < 3 && edgeCount < MAX_EDGES - 1;
          j++
        ) {
          const jk = j * 3;
          const dx = pos[ik] - pos[jk];
          const dy = pos[ik + 1] - pos[jk + 1];
          const dz = pos[ik + 2] - pos[jk + 2];
          const d2 = dx * dx + dy * dy + dz * dz;

          if (d2 < DIST2) {
            const alpha = (1 - Math.sqrt(d2) / CONNECT_DIST) * 0.88;
            const ei = edgeCount * 2;

            lp[ei * 3] = pos[ik];
            lp[ei * 3 + 1] = pos[ik + 1];
            lp[ei * 3 + 2] = pos[ik + 2];
            lp[(ei + 1) * 3] = pos[jk];
            lp[(ei + 1) * 3 + 1] = pos[jk + 1];
            lp[(ei + 1) * 3 + 2] = pos[jk + 2];

            // Source vertex — full alpha; target vertex — 50 % fade
            lc[ei * 3] = EDGE_R * alpha;
            lc[ei * 3 + 1] = EDGE_G * alpha;
            lc[ei * 3 + 2] = EDGE_B * alpha;
            lc[(ei + 1) * 3] = EDGE_R * alpha * 0.45;
            lc[(ei + 1) * 3 + 1] = EDGE_G * alpha * 0.45;
            lc[(ei + 1) * 3 + 2] = EDGE_B * alpha * 0.45;

            edgeCount++;
            conns++;
          }
        }
      }

      lineGeo.setDrawRange(0, edgeCount * 2);
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;

      // Smooth mouse parallax
      scene.rotation.y += (mx * 0.14 - scene.rotation.y) * 0.024;
      scene.rotation.x += (my * 0.08 - scene.rotation.x) * 0.024;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      dotTex.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
