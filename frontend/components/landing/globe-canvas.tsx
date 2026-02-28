"use client";

/**
 * GlobeCanvas — rotating wireframe globe with orbiting neuron particles.
 *
 * Visual:
 *  - A wireframe sphere (globe) rotates slowly on its own axis.
 *  - ~65% of particles orbit near the globe surface (tangential velocity,
 *    projected back each frame to maintain orbit radius).
 *  - Remaining ~35% drift freely in the space around the globe, bouncing off
 *    the globe surface and an outer bounding sphere.
 *  - Nearby particles are connected by fading neural-style edges.
 *  - Mouse parallax tilts the whole scene gently.
 *
 * Always load with: dynamic(() => import(...), { ssr: false })
 */

import { useRef, useEffect } from "react";
import * as THREE from "three";

const GLOBE_R = 88;
const OUTER_R = GLOBE_R * 2.1;

export default function GlobeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;
    const isMobile = W < 768;

    const N = isMobile ? 65 : 110;
    const CONNECT_DIST = isMobile ? 44 : 58;
    const DIST2 = CONNECT_DIST * CONNECT_DIST;
    const MAX_EDGES = N * 4;
    const N_SURFACE = Math.floor(N * 0.65);

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
    camera.position.z = 305;

    // ── Globe wireframe ───────────────────────────────────────────────────────
    const globeSphereGeo = new THREE.SphereGeometry(GLOBE_R, 22, 16);
    const globeWireGeo = new THREE.WireframeGeometry(globeSphereGeo);
    const globeWireMat = new THREE.LineBasicMaterial({
      color: 0x7755bb,
      transparent: true,
      opacity: 0.18,
    });
    const globeMesh = new THREE.LineSegments(globeWireGeo, globeWireMat);
    scene.add(globeMesh);

    // Soft inner glow
    const innerGeo = new THREE.SphereGeometry(GLOBE_R * 0.975, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x9966ee,
      transparent: true,
      opacity: 0.038,
    });
    scene.add(new THREE.Mesh(innerGeo, innerMat));

    // ── Glow dot texture for particles ────────────────────────────────────────
    const dotCvs = document.createElement("canvas");
    dotCvs.width = 64;
    dotCvs.height = 64;
    const dctx = dotCvs.getContext("2d")!;
    const grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(86, 64, 162, 1)");
    grad.addColorStop(0.28, "rgba(86, 64, 162, 0.78)");
    grad.addColorStop(0.62, "rgba(86, 64, 162, 0.25)");
    grad.addColorStop(1, "rgba(86, 64, 162, 0)");
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCvs);

    // ── Particles (flat typed arrays for performance) ─────────────────────────
    const positions = new Float32Array(N * 3);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const vz = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const onSurface = i < N_SURFACE;
      const r = onSurface
        ? GLOBE_R + Math.random() * 14
        : GLOBE_R * 1.18 + Math.random() * GLOBE_R * 0.65;

      const phi = Math.acos(2 * Math.random() - 1);
      const th = Math.random() * Math.PI * 2;
      const x = r * Math.sin(phi) * Math.cos(th);
      const y = r * Math.sin(phi) * Math.sin(th);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Random unit direction
      let ux = Math.random() - 0.5;
      let uy = Math.random() - 0.5;
      let uz = (Math.random() - 0.5) * 0.5;
      const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      ux /= uLen;
      uy /= uLen;
      uz /= uLen;

      const speed = 0.09 + Math.random() * 0.14;

      if (onSurface) {
        // Project direction onto tangent plane so particle orbits the surface
        const nx = x / r, ny = y / r, nz = z / r;
        const dot = ux * nx + uy * ny + uz * nz;
        const tx = ux - dot * nx;
        const ty = uy - dot * ny;
        const tz = uz - dot * nz;
        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
        vx[i] = (tx / tLen) * speed;
        vy[i] = (ty / tLen) * speed;
        vz[i] = (tz / tLen) * speed;
      } else {
        vx[i] = ux * speed;
        vy[i] = uy * speed;
        vz[i] = uz * speed * 0.55;
      }
    }

    const pGeo = new THREE.BufferGeometry();
    const posBuf = new THREE.BufferAttribute(positions.slice(), 3);
    posBuf.setUsage(THREE.DynamicDrawUsage);
    pGeo.setAttribute("position", posBuf);

    const pMat = new THREE.PointsMaterial({
      map: dotTex,
      size: isMobile ? 7 : 10,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Neural edges ──────────────────────────────────────────────────────────
    const lpArr = new Float32Array(MAX_EDGES * 2 * 3);
    const lcArr = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeGeo = new THREE.BufferGeometry();
    const lpBuf = new THREE.BufferAttribute(lpArr, 3);
    const lcBuf = new THREE.BufferAttribute(lcArr, 3);
    lpBuf.setUsage(THREE.DynamicDrawUsage);
    lcBuf.setUsage(THREE.DynamicDrawUsage);
    edgeGeo.setAttribute("position", lpBuf);
    edgeGeo.setAttribute("color", lcBuf);
    edgeGeo.setDrawRange(0, 0);

    // Purple edge base color (linear-sRGB, 0-1 per channel)
    const ER = 0.34, EG = 0.25, EB = 0.64;
    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // ── Mouse parallax ────────────────────────────────────────────────────────
    let mx = 0,
      my = 0;
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Animation loop ────────────────────────────────────────────────────────
    let raf = 0;
    let t = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.004;

      const pos = pGeo.attributes.position.array as Float32Array;

      for (let i = 0; i < N; i++) {
        const k = i * 3;
        let x = pos[k] + vx[i];
        let y = pos[k + 1] + vy[i];
        let z = pos[k + 2] + vz[i];
        const r = Math.sqrt(x * x + y * y + z * z) || 0.001;

        if (i < N_SURFACE) {
          // Keep surface particles at orbit radius (with gentle breathing motion)
          const targetR = GLOBE_R + Math.sin(t * 0.55 + i * 0.38) * 5 + 5;
          const scale = targetR / r;
          x *= scale;
          y *= scale;
          z *= scale;
          // Small tangential correction: remove radial velocity component
          const nx = x / targetR,
            ny = y / targetR,
            nz = z / targetR;
          const dot = vx[i] * nx + vy[i] * ny + vz[i] * nz;
          vx[i] -= dot * nx * 0.12;
          vy[i] -= dot * ny * 0.12;
          vz[i] -= dot * nz * 0.12;
        } else {
          // Reflect off outer bounding sphere
          if (r > OUTER_R) {
            const invR = 1 / r;
            const nx = x * invR,
              ny = y * invR,
              nz = z * invR;
            const dot = vx[i] * nx + vy[i] * ny + vz[i] * nz;
            vx[i] -= 2 * dot * nx;
            vy[i] -= 2 * dot * ny;
            vz[i] -= 2 * dot * nz;
          }
          // Reflect off globe surface
          if (r < GLOBE_R * 1.06) {
            const invR = 1 / r;
            const nx = x * invR,
              ny = y * invR,
              nz = z * invR;
            const dot = vx[i] * nx + vy[i] * ny + vz[i] * nz;
            vx[i] -= 2 * dot * nx;
            vy[i] -= 2 * dot * ny;
            vz[i] -= 2 * dot * nz;
          }
        }

        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;
      }
      pGeo.attributes.position.needsUpdate = true;

      // Pulse particle size
      pMat.size = (isMobile ? 7 : 10) + Math.sin(t * 1.15) * 1.0;

      // Build neural edge geometry
      const lp = edgeGeo.attributes.position.array as Float32Array;
      const lc = edgeGeo.attributes.color.array as Float32Array;
      let ec = 0;

      for (let i = 0; i < N && ec < MAX_EDGES - 1; i++) {
        const ik = i * 3;
        let conns = 0;
        for (
          let j = i + 1;
          j < N && conns < 4 && ec < MAX_EDGES - 1;
          j++
        ) {
          const jk = j * 3;
          const dx = pos[ik] - pos[jk];
          const dy = pos[ik + 1] - pos[jk + 1];
          const dz = pos[ik + 2] - pos[jk + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < DIST2) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / CONNECT_DIST) * 0.85;
            const ei = ec * 2;
            lp[ei * 3] = pos[ik];
            lp[ei * 3 + 1] = pos[ik + 1];
            lp[ei * 3 + 2] = pos[ik + 2];
            lp[(ei + 1) * 3] = pos[jk];
            lp[(ei + 1) * 3 + 1] = pos[jk + 1];
            lp[(ei + 1) * 3 + 2] = pos[jk + 2];
            lc[ei * 3] = ER * alpha;
            lc[ei * 3 + 1] = EG * alpha;
            lc[ei * 3 + 2] = EB * alpha;
            lc[(ei + 1) * 3] = ER * alpha * 0.45;
            lc[(ei + 1) * 3 + 1] = EG * alpha * 0.45;
            lc[(ei + 1) * 3 + 2] = EB * alpha * 0.45;
            ec++;
            conns++;
          }
        }
      }

      edgeGeo.setDrawRange(0, ec * 2);
      edgeGeo.attributes.position.needsUpdate = true;
      edgeGeo.attributes.color.needsUpdate = true;

      // Globe wireframe rotates independently on its own axis
      globeMesh.rotation.y += 0.0035;
      globeMesh.rotation.x += 0.0009;

      // Whole scene follows mouse with spring damping
      scene.rotation.y += (mx * 0.10 - scene.rotation.y) * 0.02;
      scene.rotation.x += (my * 0.06 - scene.rotation.x) * 0.02;

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
      pGeo.dispose();
      pMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      globeSphereGeo.dispose();
      globeWireGeo.dispose();
      globeWireMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
