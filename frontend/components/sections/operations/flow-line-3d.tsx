"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";


interface FlowLine3DProps {
  start: [number, number, number];
  end: [number, number, number];
  animated?: boolean;
}

export function FlowLine3D({ start, end, animated = false }: FlowLine3DProps) {
  const particleRef = useRef<THREE.Mesh>(null);

  const points = useMemo(() => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  }, [start, end]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  // Memoize Line objects — creating them inline (new THREE.Line(...) in JSX)
  // allocates a new GPU object every render, quickly exhausting WebGL resources
  // and causing context loss.
  const bgLine = useMemo(
    () =>
      new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: "#ffffff",
          opacity: 0.05,
          transparent: true,
        }),
      ),
    [geometry],
  );

  const glowLine = useMemo(
    () =>
      new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: "#00f2f2",
          opacity: 0.2,
          transparent: true,
        }),
      ),
    [geometry],
  );

  useFrame((state) => {
    if (animated && particleRef.current) {
      const time = state.clock.getElapsedTime();
      const speed = 0.5;
      const progress = (time * speed) % 1;

      const pos = new THREE.Vector3().lerpVectors(
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
        progress,
      );

      particleRef.current.position.copy(pos);
      const material = particleRef.current.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = Math.sin(progress * Math.PI);
      }
    }
  });

  return (
    <group>
      {/* Background dashed-style line */}
      <primitive object={bgLine} />

      {/* Main glowing connection */}
      <primitive object={glowLine} />

      {animated && (
        <mesh ref={particleRef}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#00f2f2" transparent opacity={0.8} />
          <pointLight color="#00f2f2" intensity={0.5} distance={1} />
        </mesh>
      )}
    </group>
  );
}
